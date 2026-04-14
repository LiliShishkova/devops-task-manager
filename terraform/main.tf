provider "kubernetes" {
  config_path = "~/.kube/config"
}

resource "kubernetes_namespace" "devops" {
  metadata {
    name = "devops"
  }
}
