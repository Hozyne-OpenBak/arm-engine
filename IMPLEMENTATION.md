# Phase 3 - Multi-Tenant Provisioning System

## Kubernetes Cluster Setup Requirements
Ensure Kubernetes is set up and accessible:

1. Install `kubectl` and authenticate with your Kubernetes cluster.
2. Ensure your cluster supports namespaces, network policies, and resource quotas.
3. Install Helm CLI on your system (`https://helm.sh/docs/intro/install/`).
4. Verify access to the cluster:
   ```
kubectl config current-context
kubectl get nodes
```

## Helm Installation

Ensure that Helm is installed and configured:
```bash
helm repo add stable https://charts.helm.sh/stable
helm repo update
```
Configure the `tenant-chart` Helm chart with tenant-specific values as mentioned in the `/infrastructure/helm/tenant-chart/values.yaml`.

## Provisioning Service Configuration

Set up the provisioning service:
1. Place `kubeconfig` file at the path specified in `KUBERNETES_CONFIG_PATH`.
2. Update `.env` variables:
   ```
   KUBERNETES_CONFIG_PATH=/path/to/kubeconfig
   HELM_CHART_PATH=/path/to/helm/chart
   TENANT_NAMESPACE_PREFIX=tenant-
   ```
3. Ensure the application has network access to the Kubernetes API.

## Running Tests

To run the unit and integration tests for provisioning:
```bash
npm run test
npm run test:integration
```
Tests cover:
1. Namespace creation verification
2. Helm deployment verification
3. Error handling and rollback flows

## Testing with Minikube or Kind
1. Set up Minikube or Kind on your local machine.
2. Deploy the `tenant-chart` locally using Helm to verify configurations.
3. Verify Kubernetes resources:
```bash
kubectl get namespaces
kubectl describe namespace <namespace>
```